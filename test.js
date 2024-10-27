const duapuluhDetik = {
  time_start: 20,
  time_end: 40,
};
const sepuluhDetik = {
  time_start: 10,
  time_end: 20,
};
const delapanDetik = {
  time_start: 30,
  time_end: 38,
};
const enamDetik = {
  time_start: 40,
  time_end: 46,
};
const empatDetik = {
  time_start: 24,
  time_end: 28,
};
const duaDetik = {
  time_start: 2,
  time_end: 4,
};
const determineOutput = (duration) => {
  if (duration <= 2) {
    return duaDetik;
  } else if (duration <= 4) {
    return empatDetik;
  } else if (duration <= 6) {
    return enamDetik;
  } else if (duration <= 8) {
    return delapanDetik;
  } else if (duration <= 10) {
    return sepuluhDetik;
  } else if (duration <= 12) {
    return [sepuluhDetik, duaDetik];
  } else if (duration <= 14) {
    return [sepuluhDetik, empatDetik];
  } else if (duration <= 16) {
    return [sepuluhDetik, enamDetik];
  } else if (duration <= 18) {
    return [sepuluhDetik, delapanDetik];
  } else if (duration <= 19 || duration <= 20) {
    return duapuluhDetik;
  } else if (duration <= 21) {
    return [duapuluhDetik, duaDetik];
  } else if (duration <= 23) {
    return [duapuluhDetik, empatDetik];
  } else if (duration <= 26) {
    return [duapuluhDetik, enamDetik];
  } else if (duration <= 28) {
    return [duapuluhDetik, delapanDetik];
  } else if (duration <= 30) {
    return [duapuluhDetik, sepuluhDetik];
  } else if (duration <= 31) {
    return [duapuluhDetik, sepuluhDetik, duaDetik];
  } else if (duration <= 33) {
    return [duapuluhDetik, sepuluhDetik, empatDetik];
  } else if (duration <= 36) {
    return [duapuluhDetik, sepuluhDetik, enamDetik];
  } else if (duration <= 38) {
    return [duapuluhDetik, sepuluhDetik, delapanDetik];
  } else if (duration <= 40) {
    return [duapuluhDetik, duapuluhDetik];
  } else if (duration <= 41) {
    return [duapuluhDetik, duapuluhDetik, duaDetik];
  } else if (duration <= 43) {
    return [duapuluhDetik, duapuluhDetik, empatDetik];
  } else if (duration <= 46) {
    return [duapuluhDetik, duapuluhDetik, enamDetik];
  } else if (duration <= 48) {
    return [duapuluhDetik, duapuluhDetik, delapanDetik];
  } else if (duration <= 50) {
    return [duapuluhDetik, duapuluhDetik, sepuluhDetik];
  }
  return null;
};

const getDuration = (req, res) => {
  const { duration } = req.body;

  if (typeof duration !== "number") {
    return res.status(400).json({ error: "Durasi harus berupa angka." });
  }

  const result = determineOutput(duration);
  if (result === null) {
    return res
      .status(400)
      .json({ error: "Durasi melebihi batas yang ditentukan." });
  }

  return res.json({ result });
};

module.exports = getDuration;
module.exports = determineOutput;
