const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const { token } = req.cookies;
    if (!token) {
        return res.status(403).send('Please login first');
    }

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.error('Invalid token');
        res.status(401).send('Invalid token');
    }
};
module.exports = auth;