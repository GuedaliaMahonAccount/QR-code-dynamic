import QRCode from "qrcode";
import Jimp from "jimp";

async function createCircularMask(size, borderWidth, borderColor, bgColor) {
  const mask = new Jimp(size, size, 0x00000000);
  const center = size / 2;
  const outerRadius = size / 2;
  const innerRadius = outerRadius - borderWidth;

  mask.scan(0, 0, size, size, function(x, y, idx) {
    const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
    
    if (distance <= outerRadius && distance > innerRadius) {
      const color = Jimp.intToRGBA(borderColor);
      this.bitmap.data[idx] = color.r;
      this.bitmap.data[idx + 1] = color.g;
      this.bitmap.data[idx + 2] = color.b;
      this.bitmap.data[idx + 3] = 255;
    } else if (distance <= innerRadius) {
      const color = Jimp.intToRGBA(bgColor);
      this.bitmap.data[idx] = color.r;
      this.bitmap.data[idx + 1] = color.g;
      this.bitmap.data[idx + 2] = color.b;
      this.bitmap.data[idx + 3] = 255;
    }
  });

  return mask;
}

async function generateAllVersions() {
  const versions = [
    { name: "violet", color: "#8B7EC8", border: 0xB5A8E0FF }
  ];

  for (const version of versions) {
    const qrBuffer = await QRCode.toBuffer("https://www.guardianspheres.com/", {
      color: { dark: version.color, light: "#FFFFFF" },
      errorCorrectionLevel: "H",
      margin: 3,
      scale: 15,
      width: 1000
    });

    const qr = await Jimp.read(qrBuffer);
    const logo = await Jimp.read("public/logo.png");

    const logoSize = Math.floor(qr.bitmap.width * 0.32);
    logo.resize(logoSize, logoSize);

    const circleSize = Math.floor(logoSize * 1.4);
    const borderWidth = Math.floor(circleSize * 0.08);
    const circle = await createCircularMask(
      circleSize, 
      borderWidth,
      version.border,
      0xFFFFFFFF
    );

    qr.composite(circle, (qr.bitmap.width - circleSize) / 2, (qr.bitmap.height - circleSize) / 2);
    qr.composite(logo, (qr.bitmap.width - logoSize) / 2, (qr.bitmap.height - logoSize) / 2);

    await qr.writeAsync(`qr_${version.name}.png`);
    console.log(`✅ Généré: qr_${version.name}.png`);
  }
}

generateAllVersions();