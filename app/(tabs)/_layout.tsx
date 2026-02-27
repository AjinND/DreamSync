/**
 * DreamSync Tab Layout
 * Tabs: Home | Community | Journeys | Account
 */

import { useTheme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();

  // Android < 31 doesn't support advanced blur well, so opaque fallback
  const isOlderAndroid = Platform.OS === 'android' && Platform.Version < 31;
  const Container: any = isOlderAndroid ? View : BlurView;

  const containerProps = isOlderAndroid
    ? { style: [styles.tabBar, { backgroundColor: isDark ? 'rgba(15, 8, 20, 0.95)' : 'rgba(247, 245, 248, 0.95)' }] }
    : {
      intensity: 100,
      tint: isDark ? "dark" : ("light" as any),
      style: [styles.tabBar, { backgroundColor: isDark ? 'rgba(15, 8, 20, 0.85)' : 'rgba(247, 245, 248, 0.85)' }]
    };

  return (
    <View style={styles.floatingContainer}>
      <Container {...containerProps}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const iconName =
            route.name === 'index' ? (isFocused ? 'home' : 'home-outline') :
              route.name === 'community' ? (isFocused ? 'globe' : 'globe-outline') :
                route.name === 'journeys' ? (isFocused ? 'people' : 'people-outline') :
                  route.name === 'account' ? (isFocused ? 'person' : 'person-outline') : 'help';

          // For custom text color, use accent. primary is too dark sometimes.
          const activeColor = colors.primary;
          const inactiveColor = colors.textMuted;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel as any}
              testID={(options as any).tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons
                name={iconName as any}
                size={24}
                color={isFocused ? activeColor : inactiveColor}
              />
              <Text style={{
                color: isFocused ? activeColor : inactiveColor,
                fontSize: 10,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                marginTop: 4
              }}>
                {options.title !== undefined ? options.title : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Container>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home" }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community" }}
      />
      <Tabs.Screen
        name="journeys"
        options={{ title: "Journeys" }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account" }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 9999, // full rounded
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: "#8c25f4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  }
});
