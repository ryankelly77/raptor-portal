// Minimal test - step 1
module.exports = async (req, res) => {
  return res.status(200).json({ status: 'ok', step: 1 });
};
