export type DriverTabName = 'index' | 'trip' | 'tracking' | 'profile';

export type DriverTabIcon = 'home' | 'local-shipping' | 'location-on' | 'person';

export interface DriverTabConfig {
  name: DriverTabName;
  label: string;
  icon: DriverTabIcon;
}
