const startTimes = [];

async function rateLimiter(call) {
  const lastSecond = (new Date().getTime()) - 1000;
  if (startTimes.filter(v => v > lastSecond).length >= 5) {
    await new Promise(r => setTimeout(r, 1000));
  }
  // TODO: cleanup startTimes to avoid memory leak
  startTimes.push(new Date().getTime());
  return call;
}

export default rateLimiter;