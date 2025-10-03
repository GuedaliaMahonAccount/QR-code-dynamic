import express from "express";
import QRCode from "qrcode";
import Jimp from "jimp";

const app = express();
app.use(express.json());

let currentUrl = process.env.DEFAULT_REDIRECT || "https://www.guardianspheres.com/";

app.get("/redirect", (req, res) => res.redirect(currentUrl));

app.post("/update", (req, res) => {
  const { newUrl } = req.body || {};
  try {
    if (!newUrl) return res.status(400).send("Missing newUrl");
    const u = new URL(newUrl);
    currentUrl = u.toString();
    res.send(`Updated to ${currentUrl}`);
  } catch {
    return res.status(400).send("newUrl must be a valid absolute URL");
  }
});

function getPublicBase(req) {
  // Sur Vercel: proto = https, host = <ton-deploy>.vercel.app ou ton domaine custom
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = req.headers.host;
  return process.env.PUBLIC_BASE_URL || `${proto}://${host}`;
}

// Helper: créer un masque circulaire avec bordure
async function createCircularMask(size, borderWidth, borderColor, bgColor) {
  const mask = new Jimp(size, size, 0x00000000);
  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius - borderWidth;

  mask.scan(0, 0, size, size, function(x, y, idx) {
    const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
    
    if (distance <= outerRadius && distance > innerRadius) {
      // Bordure
      const color = Jimp.intToRGBA(borderColor);
      this.bitmap.data[idx] = color.r;
      this.bitmap.data[idx + 1] = color.g;
      this.bitmap.data[idx + 2] = color.b;
      this.bitmap.data[idx + 3] = 255;
    } else if (distance <= innerRadius) {
      // Intérieur
      const color = Jimp.intToRGBA(bgColor);
      this.bitmap.data[idx] = color.r;
      this.bitmap.data[idx + 1] = color.g;
      this.bitmap.data[idx + 2] = color.b;
      this.bitmap.data[idx + 3] = 255;
    }
  });

  return mask;
}

// Version : Violet doux (comme ton logo)
app.get("/qr-violet", async (req, res) => {
  try {
    const base = getPublicBase(req);   // <<--- passe req ici
    const qrBuffer = await QRCode.toBuffer(`${base}/redirect`, {
      color: { dark: "#8B7EC8", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
      margin: 3,
      scale: 15,
      width: 1000
    });

    const qr = await Jimp.read(qrBuffer);
    const logo = await Jimp.read("logo.png");

    // Logo plus grand mais avec zone de sécurité
    const logoSize = Math.floor(qr.bitmap.width * 0.32);
    logo.resize(logoSize, logoSize);

    // Cercle avec bordure violette épaisse
    const circleSize = Math.floor(logoSize * 1.4);
    const borderWidth = Math.floor(circleSize * 0.08);
    const circle = await createCircularMask(
      circleSize, 
      borderWidth,
      0xB5A8E0FF, // Bordure violet clair
      0xFFFFFFFF  // Fond blanc
    );

    const circleX = (qr.bitmap.width - circleSize) / 2;
    const circleY = (qr.bitmap.height - circleSize) / 2;
    const logoX = (qr.bitmap.width - logoSize) / 2;
    const logoY = (qr.bitmap.height - logoSize) / 2;

    qr.composite(circle, circleX, circleY);
    qr.composite(logo, logoX, logoY);

    const out = await qr.getBufferAsync(Jimp.MIME_PNG);
    res.type("png").send(out);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error: " + e.message);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`\n🚀 Serveur actif sur http://localhost:${port}\n`);
  console.log(`📱 QR Code violet doux :`);
  console.log(`   💜 Violet doux      → http://localhost:${port}/qr-violet\n`);
});