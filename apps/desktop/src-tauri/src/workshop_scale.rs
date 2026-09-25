//! Read-only, bounded raw-frame transport for Workshop Gold/Stone scales.
//! Parsing and material posting remain server-side. No software tare is applied.
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::io::{ErrorKind, Read};
use std::net::{Ipv4Addr, SocketAddrV4, TcpStream};
use std::time::{Duration, Instant};

#[derive(Deserialize)]
#[serde(tag = "kind")]
pub enum ScaleTransport {
    #[serde(rename = "SERIAL")]
    Serial {
        port: String,
        #[serde(rename = "baudRate")]
        baud_rate: u32,
        #[serde(rename = "dataBits")]
        data_bits: u8,
        #[serde(rename = "stopBits")]
        stop_bits: u8,
        parity: String,
    },
    #[serde(rename = "TCP")]
    Tcp { host: String, port: u16 },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScaleFrame {
    raw_frame: String,
    reading_at: String,
}

#[tauri::command]
pub fn list_scale_serial_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|port| port.port_name).collect())
        .map_err(|error| format!("Could not enumerate serial scale ports: {error}"))
}

fn private_lan_ip(host: &str) -> Result<Ipv4Addr, String> {
    let ip: Ipv4Addr = host
        .parse()
        .map_err(|_| "Scale TCP host must be an IPv4 address")?;
    let octets = ip.octets();
    if octets[0] == 10
        || (octets[0] == 172 && (16..=31).contains(&octets[1]))
        || (octets[0] == 192 && octets[1] == 168)
    {
        Ok(ip)
    } else {
        Err("Scale TCP host must be on a private LAN".into())
    }
}

fn collect_frames(
    reader: &mut dyn Read,
    max_frames: usize,
    minimum_gap: Duration,
) -> Result<Vec<ScaleFrame>, String> {
    let deadline = Instant::now() + Duration::from_secs(5);
    let mut frames = Vec::with_capacity(max_frames);
    let mut last_sample_at: Option<Instant> = None;
    let mut pending = Vec::<u8>::new();
    // A continuously streaming scale can already be mid-frame on connect.
    let mut synced = false;
    let mut chunk = [0_u8; 256];
    while frames.len() < max_frames && Instant::now() < deadline {
        match reader.read(&mut chunk) {
            Ok(0) => break,
            Ok(size) => {
                for byte in &chunk[..size] {
                    if *byte == b'\n' {
                        if !synced {
                            synced = true;
                            pending.clear();
                            continue;
                        }
                        let line = String::from_utf8(pending.clone())
                            .map_err(|_| "Scale sent a non-ASCII frame")?;
                        let line = line.trim_end_matches('\r').trim().to_string();
                        pending.clear();
                        if !line.is_empty() {
                            if !line.is_ascii() {
                                return Err("Scale sent a non-ASCII frame".into());
                            }
                            let sampled_at = Instant::now();
                            if last_sample_at
                                .is_some_and(|last| sampled_at.duration_since(last) < minimum_gap)
                            {
                                continue;
                            }
                            frames.push(ScaleFrame {
                                raw_frame: line,
                                reading_at: Utc::now().to_rfc3339(),
                            });
                            last_sample_at = Some(sampled_at);
                            if frames.len() == max_frames {
                                break;
                            }
                        }
                    } else {
                        pending.push(*byte);
                        if pending.len() > 500 {
                            return Err("Scale frame exceeds the 500-byte limit".into());
                        }
                    }
                }
            }
            Err(error)
                if error.kind() == ErrorKind::TimedOut || error.kind() == ErrorKind::WouldBlock =>
            {
                continue
            }
            Err(error) => return Err(format!("Scale read failed: {error}")),
        }
    }
    if frames.is_empty() {
        Err("No complete scale frame arrived within five seconds".into())
    } else {
        Ok(frames)
    }
}

fn read_transport(transport: ScaleTransport, max_frames: usize) -> Result<Vec<ScaleFrame>, String> {
    match transport {
        ScaleTransport::Serial {
            port,
            baud_rate,
            data_bits,
            stop_bits,
            parity,
        } => {
            if port.len() > 256 || baud_rate < 300 || baud_rate > 115_200 {
                return Err("Invalid serial scale port or baud rate".into());
            }
            let available = list_scale_serial_ports()?;
            if !available.iter().any(|name| name == &port) {
                return Err("Serial port is not an enumerated device".into());
            }
            let bits = match data_bits {
                7 => serialport::DataBits::Seven,
                8 => serialport::DataBits::Eight,
                _ => return Err("Serial data bits must be 7 or 8".into()),
            };
            let stops = match stop_bits {
                1 => serialport::StopBits::One,
                2 => serialport::StopBits::Two,
                _ => return Err("Serial stop bits must be 1 or 2".into()),
            };
            let parity = match parity.as_str() {
                "none" => serialport::Parity::None,
                "even" => serialport::Parity::Even,
                "odd" => serialport::Parity::Odd,
                _ => return Err("Unsupported serial parity".into()),
            };
            let mut serial = serialport::new(port, baud_rate)
                .data_bits(bits)
                .stop_bits(stops)
                .parity(parity)
                .timeout(Duration::from_millis(250))
                .open()
                .map_err(|error| format!("Could not open serial scale: {error}"))?;
            collect_frames(&mut serial, max_frames, Duration::from_millis(60))
        }
        ScaleTransport::Tcp { host, port } => {
            if port == 0 {
                return Err("Scale TCP port is required".into());
            }
            let ip = private_lan_ip(&host)?;
            let address = SocketAddrV4::new(ip, port);
            let mut stream = TcpStream::connect_timeout(&address.into(), Duration::from_secs(2))
                .map_err(|error| format!("Could not connect to LAN scale: {error}"))?;
            stream
                .set_read_timeout(Some(Duration::from_millis(250)))
                .map_err(|error| format!("Could not set scale read timeout: {error}"))?;
            collect_frames(&mut stream, max_frames, Duration::from_millis(60))
        }
    }
}

#[tauri::command]
pub async fn read_scale_frames(
    transport: ScaleTransport,
    max_frames: u8,
) -> Result<Vec<ScaleFrame>, String> {
    if !(1..=8).contains(&max_frames) {
        return Err("Scale frame request must be between one and eight frames".into());
    }
    tokio::task::spawn_blocking(move || read_transport(transport, max_frames as usize))
        .await
        .map_err(|error| format!("Scale reader failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::{collect_frames, private_lan_ip, ScaleTransport};
    use std::io::{Cursor, Read};
    use std::thread::sleep;
    use std::time::Duration;

    #[test]
    fn only_private_lan_scale_hosts_are_allowed() {
        assert!(private_lan_ip("192.168.1.4").is_ok());
        assert!(private_lan_ip("172.16.0.8").is_ok());
        assert!(private_lan_ip("127.0.0.1").is_err());
        assert!(private_lan_ip("8.8.8.8").is_err());
    }

    #[test]
    fn serial_profile_accepts_the_registered_camel_case_settings() {
        let profile: ScaleTransport = serde_json::from_value(serde_json::json!({
            "kind": "SERIAL", "port": "COM3", "baudRate": 9600,
            "dataBits": 8, "stopBits": 1, "parity": "none"
        }))
        .unwrap();
        assert!(matches!(
            profile,
            ScaleTransport::Serial {
                baud_rate: 9600,
                ..
            }
        ));
    }

    #[test]
    fn serial_or_tcp_stream_returns_bounded_complete_raw_frames() {
        let mut stream = Cursor::new(b"25 g\nST NET 100.25 g\r\nUS NET 100.24 g\n".to_vec());
        let frames = collect_frames(&mut stream, 3, Duration::ZERO).unwrap();
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].raw_frame, "ST NET 100.25 g");
        assert_eq!(frames[1].raw_frame, "US NET 100.24 g");

        let mut oversized = Cursor::new(vec![b'X'; 501]);
        assert!(collect_frames(&mut oversized, 1, Duration::ZERO).is_err());
    }

    #[test]
    fn fast_stream_frames_are_sampled_across_a_real_stability_window() {
        struct TimedStream {
            index: usize,
        }
        impl Read for TimedStream {
            fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
                if self.index >= 4 {
                    return Ok(0);
                }
                if self.index > 0 {
                    sleep(Duration::from_millis(60));
                }
                let frame: &[u8] = if self.index == 0 {
                    b"25 g\n"
                } else {
                    b"ST NET 100.25 g\n"
                };
                buf[..frame.len()].copy_from_slice(frame);
                self.index += 1;
                Ok(frame.len())
            }
        }

        let frames =
            collect_frames(&mut TimedStream { index: 0 }, 3, Duration::from_millis(60)).unwrap();
        assert_eq!(frames.len(), 3);
        let first = chrono::DateTime::parse_from_rfc3339(&frames[0].reading_at).unwrap();
        let last = chrono::DateTime::parse_from_rfc3339(&frames[2].reading_at).unwrap();
        assert!((last - first).num_milliseconds() >= 100);

        let mut burst =
            Cursor::new(b"25 g\nST NET 100.25 g\nST NET 100.25 g\nST NET 100.25 g\n".to_vec());
        assert_eq!(
            collect_frames(&mut burst, 3, Duration::from_millis(60))
                .unwrap()
                .len(),
            1
        );
    }
}
