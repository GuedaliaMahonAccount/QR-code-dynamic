export default function handler(req, res) {
  const target =
    (process.env.DEFAULT_REDIRECT || "https://www.guardianspheres.com/").trim();

  // Option bonus : permettre ?to=<url> pour tester une autre cible à la volée
  const urlParam = req.query.to;
  let finalTarget = target;
  try {
    if (urlParam) {
      const u = new URL(urlParam);
      finalTarget = u.toString();
    }
  } catch {}

  res.setHeader("Location", finalTarget);
  res.status(302).end();
}
