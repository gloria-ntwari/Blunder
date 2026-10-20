export const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ message });
};
