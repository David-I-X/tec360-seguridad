import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { StyleSheet, View, ViewStyle, Platform, useColorScheme } from 'react-native';
import MapView, {
  MapViewProps,
  Region,
  EdgePadding,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { MAP_STYLE_LIGHT, MAP_STYLE_DARK } from './map-styles';

export interface TecMapViewRef {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: { edgePadding?: EdgePadding; animated?: boolean }
  ) => void;
  getInnerMap: () => MapView | null;
}

export interface TecMapViewProps extends Omit<MapViewProps, 'customMapStyle'> {
  theme?: 'light' | 'dark' | 'auto';
  containerStyle?: ViewStyle;
}

/**
 * TecMapView
 * Production-ready Google Maps container for Tec360.
 * - Uses Google Maps native vector rendering (no third-party raster tiles).
 * - Supports Light (Silver Minimalist) and Dark (Telematics) themes via customMapStyle.
 * - Works in Expo Go (uses Expo's bundled Google Maps key) and production builds.
 */
export const TecMapView = forwardRef<TecMapViewRef, TecMapViewProps>(
  (
    {
      theme = 'auto',
      style,
      containerStyle,
      initialRegion,
      children,
      mapType = 'standard',
      ...restProps
    },
    ref
  ) => {
    const internalMapRef = useRef<MapView | null>(null);
    const systemColorScheme = useColorScheme();

    // Determine active theme
    const activeTheme = useMemo(() => {
      if (theme === 'light') return 'light';
      if (theme === 'dark') return 'dark';
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }, [theme, systemColorScheme]);

    // Active custom map style JSON
    const activeMapStyle = useMemo(() => {
      return activeTheme === 'dark' ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
    }, [activeTheme]);

    // Forwarded imperative methods
    useImperativeHandle(ref, () => ({
      animateToRegion: (region: Region, duration: number = 600) => {
        internalMapRef.current?.animateToRegion(region, duration);
      },
      fitToCoordinates: (
        coordinates: { latitude: number; longitude: number }[],
        options?: { edgePadding?: EdgePadding; animated?: boolean }
      ) => {
        if (!coordinates || coordinates.length === 0) return;
        internalMapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: options?.edgePadding || { top: 90, right: 50, bottom: 120, left: 50 },
          animated: options?.animated ?? true,
        });
      },
      getInnerMap: () => internalMapRef.current,
    }));

    return (
      <View style={[styles.container, containerStyle, style]}>
        <MapView
          ref={internalMapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={initialRegion}
          mapType={mapType}
          customMapStyle={activeMapStyle}
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          loadingEnabled={true}
          loadingIndicatorColor="#8b5cf6"
          loadingBackgroundColor={activeTheme === 'dark' ? '#0f172a' : '#f5f5f5'}
          {...restProps}
        >
          {children}
        </MapView>
      </View>
    );
  }
);

TecMapView.displayName = 'TecMapView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#050810',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
