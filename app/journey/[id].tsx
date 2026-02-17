import { Redirect, useLocalSearchParams } from 'expo-router';

export default function JourneyDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/(tabs)/journeys" />;
  return <Redirect href={`/item/${id}` as any} />;
}

