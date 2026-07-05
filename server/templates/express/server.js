import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from your Express API 🚀' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${port}`);
});
