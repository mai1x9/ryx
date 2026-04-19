const traces = [];

export function trace(agent, step, data) {
  const entry = {
    agent,
    step,
    data,
    timestamp: new Date().toISOString()
  };
  traces.push(entry);
  console.log(`[TRACE] ${agent}:${step}`, JSON.stringify(data));
  return entry;
}

export function getTraces() {
  return [...traces];
}

export function clearTraces() {
  traces.length = 0;
}