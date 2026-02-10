import React from 'react';
import { BucketLoaderFull } from './BucketLoaderFull';
import { BucketLoaderInline } from './BucketLoaderInline';
import { BucketLoaderMini } from './BucketLoaderMini';

export interface BucketLoaderProps {
  variant?: 'full' | 'inline' | 'mini';
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg';
  duration?: number;
  reducedMotion?: boolean;
  fadeIn?: boolean;
  fadeOut?: boolean;
}

export function BucketLoader({
  variant = 'full',
  message,
  submessage,
  size,
  duration,
  reducedMotion,
  fadeIn,
  fadeOut,
}: BucketLoaderProps) {
  switch (variant) {
    case 'inline':
      return <BucketLoaderInline message={message} />;

    case 'mini':
      return <BucketLoaderMini />;

    case 'full':
    default:
      return <BucketLoaderFull message={message} submessage={submessage} />;
  }
}
