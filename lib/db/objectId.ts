export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const isObjectId = (value: string) => OBJECT_ID_PATTERN.test(value);
