// @types/ngeohash.d.ts

declare module 'ngeohash' {
    export function encode(latitude: number, longitude: number, precision?: number): string;
    export function decode(hash: string): { latitude: number; longitude: number };
    export function neighbor(hash: string, direction: number[]): string;
    export function neighbors(hash: string): string[];
    export function decode_bbox(hash: string): number[];
    export function decode_int(hash_int: number): { latitude: number; longitude: number };
    export function encode_int(lat: number, lon: number, bitDepth?: number): number;
  }