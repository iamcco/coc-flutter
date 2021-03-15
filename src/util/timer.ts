export const delay = (duration: number): Promise<void> => {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, duration);
  });
};
