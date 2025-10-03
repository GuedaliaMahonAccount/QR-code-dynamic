import QRCode from "qrcode";
import Jimp from "jimp";

function getPublicBase(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers.host;
  return `${proto}://${host}`;
}

// Crée un cercle avec bordure
async function createCircularMask(size, borderWidth, borderColor, bgColor) {
  const mask = new Jimp(size, size, 0x00000000);
  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius - borderWidth;

  mask.scan(0, 0, size, size, function (x, y, idx) {
    const dx = x - center, dy = y - center;
    const distance = Math.sqrt(dx*dx + dy*dy);

    const set = (hex) => {
      const c = Jimp.intToRGBA(hex);
      this.bitmap.data[idx] = c.r;
      this.bitmap.data[idx + 1] = c.g;
      this.bitmap.data[idx + 2] = c.b;
      this.bitmap.data[idx + 3] = 255;
    };

    if (distance <= outerRadius && distance > innerRadius) set(borderColor);
    else if (distance <= innerRadius) set(bgColor);
  });

  return mask;
}

export default async function handler(req, res) {
  try {
    const base = getPublicBase(req);

    // Le QR pointe vers /api/redirect (qui redirige ensuite vers DEFAULT_REDIRECT)
    const qrBuffer = await QRCode.toBuffer(`${base}/api/redirect`, {
      color: { dark: "#8B7EC8", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
      margin: 3,
      scale: 15,
      width: 1000,
    });

    const qr = await Jimp.read(qrBuffer);

    // Lis le logo depuis /public/logo.png
    const logo = await Jimp.read("../public/logo.png");

    const logoSize = Math.floor(qr.bitmap.width * 0.32);
    logo.resize(logoSize, logoSize);

    const circleSize = Math.floor(logoSize * 1.4);
    const borderWidth = Math.floor(circleSize * 0.08);
    const circle = await createCircularMask(
      circleSize,
      borderWidth,
      0xB5A8E0ff, // bordure violet clair
      0xffffffff  // fond blanc
    );

    const circleX = (qr.bitmap.width - circleSize) / 2;
    const circleY = (qr.bitmap.height - circleSize) / 2;
    const logoX = (qr.bitmap.width - logoSize) / 2;
    const logoY = (qr.bitmap.height - logoSize) / 2;

    qr.composite(circle, circleX, circleY);
    qr.composite(logo, logoX, logoY);

    const out = await qr.getBufferAsync(Jimp.MIME_PNG);
    res.setHeader("Content-Type", "image/png");
    res.status(200).send(out);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error: " + e.message);
  }
}
