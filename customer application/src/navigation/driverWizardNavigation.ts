import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Open Profile → Add Vehicle but return to Home → driver vehicle step on back/save. */
export function navigateToAddVehicleFromDriverWizard(
  navigation: NavigationProp<ParamListBase>,
): void {
  const tab = navigation.getParent();
  if (tab) {
    tab.navigate('Profile', {
      screen: 'AddVehicle',
      params: { returnToDriverWizard: true },
    });
    return;
  }
  navigation.navigate('Profile', {
    screen: 'AddVehicle',
    params: { returnToDriverWizard: true },
  });
}

/** Leave Add Vehicle and restore the driver booking vehicle step on Home. */
export function returnToDriverVehicleStep(navigation: NavigationProp<ParamListBase>): void {
  const tab = navigation.getParent();
  tab?.navigate('Home', { screen: 'DriverChooseVehicleType' });
}
