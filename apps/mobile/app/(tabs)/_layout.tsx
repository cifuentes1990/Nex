import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={[s.label, focused && s.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="Pedidos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" label="Vender" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: '#18181b',
    borderTopColor: '#27272a',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
  },
  wrap:       { alignItems: 'center', paddingTop: 8 },
  emoji:      { fontSize: 22 },
  label:      { fontSize: 10, color: '#52525b', marginTop: 2 },
  labelActive:{ color: '#6366f1', fontWeight: '600' },
});
