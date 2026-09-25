# Workshop scale commissioning

TRACEABLE Workshop uses a Gold Scale (0.01 g) and a Stone Scale (0.001 g). Its authoritative gram history is `WorkshopMetalJournal`; legacy `KarigarMetalMovement` and casting-tree Float summaries are not the source of truth. Opening balances and exceptional Owner/Admin overrides carry `MANUAL_OVERRIDE` and a reason. Every normal physical posting requires an online server-confirmed `WorkshopScaleReading`.

## Supported generic connection

The Orivraa Desktop app reads RS-232/USB-serial ports or a private-LAN TCP endpoint. The shop owner registers the device on Supply Chain → Metal → Factory setup, choosing purpose, serial port or private IPv4/port, baud rate, data bits, stop bits, parity and explicit stable/unstable tokens. A USB scale must enumerate as a serial port. The current generic parser accepts one bounded ASCII line containing a distinct stable or unstable token, `NET`, one positive decimal number and `g`. A line with no explicit stability indication is **not** considered stable. The physical scale must perform TARE/ZERO; Orivraa does not subtract software tare.

Desktop shows the raw frame and parsed live NET state before capture. Physical capture sends three to eight consecutive timed stable frames within five seconds. The API validates parser configuration, stable tokens, quantum, matching weights and device purpose, stores raw-frame evidence, and assigns the sequence for the weighing session. It rejects malformed or stale captures, wrong scale purpose, reused sequence, mismatched shop/device/session, and unauthorized simulator use. Posting requires a persisted reading ID; the confirm endpoint never accepts grams. No offline posting is queued.

## Collect from each actual scale

Before enabling a physical device profile, obtain from the manufacturer or capture in Desktop diagnostics:

1. At least three *stable NET* output frames at a known nonzero weight, and three *unstable* frames while the weight changes. Include exact bytes or escaped representation, line delimiter and encoding.
2. Serial settings: baud rate, parity, data bits, stop bits, flow control, port name and whether the scale streams or needs a polling command. For Ethernet, provide private IPv4, port, connection lifecycle and framing.
3. Confirm whether the scale reports gross/tare/net, how stable/unstable state is encoded, units, sign, overload and error frames, and the stated resolution of each device.

The generic ASCII parser must only be selected if these frames match its strict format. A vendor-specific polling command, binary frame, checksum, or alternate stability grammar requires a separately tested adapter/parser; do not guess a protocol. Commission with both a Gold and a Stone device, compare displayed NET weights with saved readings, test disconnect/reconnect, and test an unstable load before relying on live stock.

## Stone-set finished pieces

Stone setting posts Stone Scale grams to the selected tree, piece or group. At final receipt the Gold Scale weighs the **whole piece**. Orivraa reclassifies the already measured set-stone balance into finished stock, subtracts those grams from the gross reading to derive metal grams, and links a carat projection (1 carat = 0.2 g) to the hidden inventory item. Select the same piece/group and return any unset stones before final receipt. The stone reclassification uses the earlier setting measurements; it is not a second physical issue or a second use of a reading. Catalog edits cannot rewrite these recorded physical weights or stones. Pricing and visibility still require normal catalog review.

## Trust boundary

The server re-parses supplied raw frames, but a generic serial/TCP device does not cryptographically attest its own output. Shop credentials and Desktop access must be controlled; treat forged frames from a compromised client as an operational fraud risk. Device diagnostics and scale audit retain who, when, device, sequence, samples and posting lineage. Production simulator capture is disabled unless the server explicitly allowlists the shop; a client-side switch cannot authorize it.
