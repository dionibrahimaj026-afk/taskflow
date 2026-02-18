export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join('. ') });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate field value entered' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Session expired - please log in again' });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
  });
};
