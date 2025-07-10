export interface IHourSlot {
  open: string;
  close: string;
}

export interface IOperationalDay {
  day: string;
  hours: IHourSlot[];
}
