export default function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  
  res.status(200).json({
    hasDatabaseURL: !!dbUrl,
    hasJWT: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    test: "Debug endpoint working"
  });
}
