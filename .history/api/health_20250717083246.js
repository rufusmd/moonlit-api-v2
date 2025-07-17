export default function handler(req, res) {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'REACH 2.0 API'
    });
}