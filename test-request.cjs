const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

async function test() {
  const adapter = new PrismaLibSql({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No users found");
    return;
  }
  
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );
  
  console.log("Got token, making request to /api/whatsapp/send...");
  
  try {
    const res = await fetch("http://localhost:3000/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        phone: "201101342266",
        message: "Test message from debugging script",
        type: "text"
      })
    });
    
    const text = await res.text();
    console.log("HTTP Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
