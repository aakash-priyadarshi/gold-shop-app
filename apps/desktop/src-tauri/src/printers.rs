// List OS-installed printers and send raw (ESC/POS) bytes to a named spooler
// printer. Used by invoice Print in the Orivraa Desktop app — browsers cannot
// read Windows Devices and Printers.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OsPrinter {
    pub name: String,
    pub driver: Option<String>,
    pub port: Option<String>,
    pub is_default: bool,
}

pub fn validate_printer_name(name: &str) -> Result<(), String> {
    let name = name.trim();
    if name.is_empty() || name.len() > 256 {
        return Err("Invalid printer name".into());
    }
    if name.starts_with('\\') || name.contains('/') || name.contains('\0') {
        return Err("Invalid printer name".into());
    }
    Ok(())
}

pub fn list_os_printers() -> Result<Vec<OsPrinter>, String> {
    #[cfg(windows)]
    {
        return windows::list_printers();
    }
    #[cfg(not(windows))]
    {
        unix::list_printers()
    }
}

pub fn send_raw_to_named_printer(printer_name: &str, data: &[u8]) -> Result<(), String> {
    validate_printer_name(printer_name)?;
    if data.is_empty() || data.len() > 2 * 1024 * 1024 {
        return Err("Print payload must be between 1 byte and 2 MB".into());
    }
    #[cfg(windows)]
    {
        return windows::print_raw(printer_name, data);
    }
    #[cfg(not(windows))]
    {
        unix::print_raw(printer_name, data)
    }
}

#[cfg(windows)]
mod windows {
    use super::OsPrinter;
    use std::ptr;
    use windows_sys::Win32::Foundation::HANDLE;
    use windows_sys::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW,
        OpenPrinterW, StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W,
        PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_2W,
    };

    fn wide_to_string(ptr: *const u16) -> Option<String> {
        if ptr.is_null() {
            return None;
        }
        let mut len = 0usize;
        unsafe {
            while *ptr.add(len) != 0 {
                len += 1;
                if len > 512 {
                    break;
                }
            }
            let slice = std::slice::from_raw_parts(ptr, len);
            let value = String::from_utf16_lossy(slice).trim().to_string();
            if value.is_empty() {
                None
            } else {
                Some(value)
            }
        }
    }

    fn to_wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn default_printer_name() -> Option<String> {
        unsafe {
            let mut size: u32 = 0;
            GetDefaultPrinterW(ptr::null_mut(), &mut size);
            if size == 0 {
                return None;
            }
            let mut buf = vec![0u16; size as usize];
            if GetDefaultPrinterW(buf.as_mut_ptr(), &mut size) == 0 {
                return None;
            }
            wide_to_string(buf.as_ptr())
        }
    }

    pub fn list_printers() -> Result<Vec<OsPrinter>, String> {
        unsafe {
            let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
            let mut needed: u32 = 0;
            let mut returned: u32 = 0;
            EnumPrintersW(
                flags,
                ptr::null(),
                2,
                ptr::null_mut(),
                0,
                &mut needed,
                &mut returned,
            );
            if needed == 0 {
                return Ok(Vec::new());
            }
            let mut buffer = vec![0u8; needed as usize];
            let ok = EnumPrintersW(
                flags,
                ptr::null(),
                2,
                buffer.as_mut_ptr(),
                needed,
                &mut needed,
                &mut returned,
            );
            if ok == 0 {
                return Err("Could not list printers installed on this computer".into());
            }
            let default_name = default_printer_name();
            let info = buffer.as_ptr() as *const PRINTER_INFO_2W;
            let mut printers = Vec::with_capacity(returned as usize);
            for i in 0..returned as usize {
                let row = &*info.add(i);
                let Some(name) = wide_to_string(row.pPrinterName) else {
                    continue;
                };
                let is_default = default_name
                    .as_ref()
                    .is_some_and(|d| d.eq_ignore_ascii_case(&name));
                printers.push(OsPrinter {
                    name,
                    driver: wide_to_string(row.pDriverName),
                    port: wide_to_string(row.pPortName),
                    is_default,
                });
            }
            Ok(printers)
        }
    }

    pub fn print_raw(printer_name: &str, data: &[u8]) -> Result<(), String> {
        let mut name = to_wide(printer_name);
        let mut doc_name = to_wide("Orivraa receipt");
        let mut datatype = to_wide("RAW");
        let mut handle: HANDLE = ptr::null_mut();
        unsafe {
            if OpenPrinterW(name.as_mut_ptr(), &mut handle, ptr::null()) == 0 || handle.is_null() {
                return Err("Could not open the selected printer".into());
            }
            let doc = DOC_INFO_1W {
                pDocName: doc_name.as_mut_ptr(),
                pOutputFile: ptr::null_mut(),
                pDatatype: datatype.as_mut_ptr(),
            };
            if StartDocPrinterW(handle, 1, (&doc as *const DOC_INFO_1W).cast()) == 0 {
                ClosePrinter(handle);
                return Err("Could not start the print job".into());
            }
            if StartPagePrinter(handle) == 0 {
                EndDocPrinter(handle);
                ClosePrinter(handle);
                return Err("Could not start the print page".into());
            }
            let mut written: u32 = 0;
            let ok = WritePrinter(
                handle,
                data.as_ptr().cast(),
                data.len() as u32,
                &mut written,
            );
            EndPagePrinter(handle);
            EndDocPrinter(handle);
            ClosePrinter(handle);
            if ok == 0 || written as usize != data.len() {
                return Err("Could not send data to the thermal printer".into());
            }
            Ok(())
        }
    }
}

#[cfg(not(windows))]
mod unix {
    use super::OsPrinter;
    use std::io::Write;
    use std::process::{Command, Stdio};

    pub fn list_printers() -> Result<Vec<OsPrinter>, String> {
        let output = Command::new("lpstat")
            .args(["-p", "-d", "-v"])
            .output()
            .map_err(|_| "Could not list printers (lpstat missing)".to_string())?;
        let text = String::from_utf8_lossy(&output.stdout);
        let mut default_name: Option<String> = None;
        let mut ports: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        let mut names: Vec<String> = Vec::new();

        for line in text.lines() {
            let line = line.trim();
            if let Some(rest) = line.strip_prefix("system default destination:") {
                default_name = Some(rest.trim().to_string());
            } else if let Some(rest) = line.strip_prefix("printer ") {
                let name = rest.split_whitespace().next().unwrap_or("").to_string();
                if !name.is_empty() {
                    names.push(name);
                }
            } else if let Some(rest) = line.strip_prefix("device for ") {
                if let Some((name, uri)) = rest.split_once(':') {
                    ports.insert(name.trim().to_string(), uri.trim().to_string());
                }
            }
        }

        Ok(names
            .into_iter()
            .map(|name| {
                let is_default = default_name
                    .as_ref()
                    .is_some_and(|d| d.eq_ignore_ascii_case(&name));
                OsPrinter {
                    port: ports.get(&name).cloned(),
                    driver: None,
                    is_default,
                    name,
                }
            })
            .collect())
    }

    pub fn print_raw(printer_name: &str, data: &[u8]) -> Result<(), String> {
        let mut child = Command::new("lp")
            .args(["-d", printer_name, "-o", "raw", "-s"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Could not start print job: {e}"))?;
        {
            let stdin = child
                .stdin
                .as_mut()
                .ok_or_else(|| "Could not write to the printer".to_string())?;
            stdin
                .write_all(data)
                .map_err(|e| format!("Could not send print data: {e}"))?;
        }
        let output = child
            .wait_with_output()
            .map_err(|e| format!("Print job failed: {e}"))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Could not print to {printer_name}{}",
                if err.trim().is_empty() {
                    String::new()
                } else {
                    format!(": {}", err.trim())
                }
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::validate_printer_name;

    #[test]
    fn rejects_remote_and_empty_names() {
        assert!(validate_printer_name("").is_err());
        assert!(validate_printer_name("\\\\server\\printer").is_err());
        assert!(validate_printer_name("EPSON TM-T20").is_ok());
    }
}
