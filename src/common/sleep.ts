export function sleep(time: number = 10) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

export default sleep;
