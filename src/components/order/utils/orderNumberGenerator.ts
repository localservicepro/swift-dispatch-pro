
import { v4 as uuidv4 } from 'uuid';

export const generateOrderNumber = async (): Promise<string> => {
  const newUuid = uuidv4();
  const shortUuid = newUuid.substring(0, 8);
  return `ORD-${shortUuid.toUpperCase()}`;
};
