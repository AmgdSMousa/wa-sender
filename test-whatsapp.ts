import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";

async function test() {
  console.log("Loading auth state...");
  const { state, saveCreds } = await useMultiFileAuthState("sessions/69");
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {
      console.log("Connected to WhatsApp.");
      
      const num = "201101342266";
      const jid = num + "@s.whatsapp.net";
      
      console.log("Testing onWhatsApp with number:", num);
      const res1 = await sock.onWhatsApp(num);
      console.log("Result 1:", res1);
      
      console.log("Testing onWhatsApp with jid:", jid);
      const res2 = await sock.onWhatsApp(jid);
      console.log("Result 2:", res2);
      
      console.log("Testing onWhatsApp with + number:", "+" + num);
      const res3 = await sock.onWhatsApp("+" + num);
      console.log("Result 3:", res3);

      console.log("Sending a test message directly...");
      try {
        const sendRes = await sock.sendMessage(jid, { text: "Hello from test script!" });
        console.log("Send Result:", sendRes);
      } catch (err) {
        console.error("Send Error:", err);
      }
      
      process.exit(0);
    } else if (connection === "close") {
      console.log("Connection closed", lastDisconnect?.error);
      process.exit(1);
    }
  });
}

test();
