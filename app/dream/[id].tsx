import { Redirect, useLocalSearchParams } from 'expo-router';

export default function DreamDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(tabs)" />;
  return <Redirect href={`/item/${id}` as any} />;
}

