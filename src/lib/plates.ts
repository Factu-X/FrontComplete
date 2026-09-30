export const motorcyclePlatePattern = /^[A-Z]{3}[0-9]{2}[A-Z]$/;

export const normalizeMotorcyclePlate = (plate: string) => plate.trim().toUpperCase();

export const isValidMotorcyclePlate = (plate: string) =>
  motorcyclePlatePattern.test(normalizeMotorcyclePlate(plate));
