import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { driverTabs } from '@/navigation/driver-tabs';
import { appColors } from '@/theme/colors';

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appColors.light.primary,
        tabBarInactiveTintColor: appColors.light.muted,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: appColors.light.card,
          height: 68,
          paddingTop: 8,
        },
      }}
    >
      {driverTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons color={color} size={size} name={tab.icon} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
