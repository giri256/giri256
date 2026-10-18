import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import React from 'react';
import {Easing, interpolate} from 'remotion';

export const sans = loadInter('normal', {weights: ['400', '500', '600', '800'], subsets: ['latin']}).fontFamily;
export const mono = loadMono('normal', {weights: ['400', '600'], subsets: ['latin']}).fontFamily;

export const W = 1280;
export const H = 680;
export const FPS = 30;

export const C = {
	bg: '#05070b',
	panel: '#0d1117',
	panel2: '#161b22',
	border: '#30363d',
	text: '#e6edf3',
	muted: '#8b949e',
	dim: '#484f58',
	merged: '#a371f7',
	green: '#3fb950',
	blue: '#58a6ff',
	gold: '#e3b341',
	red: '#f85149',
};

export type Project = {
	name: string;
	title: string;
	tagline: string;
	metric: string | null;
	stack: string[];
	accent: string;
	stars: number | null;
	image: string | null;
};

export type HeroProps = {name: string; login: string; role: string; tagline: string; projects: Project[]; moreProjects: number};

export type UpstreamCard = {
	repo: string;
	number: number;
	title: string;
	mergedAt: string;
	additions: number;
	deletions: number;
	language: string | null;
	avatar: string | null;
};

export type UpstreamProps = {cards: UpstreamCard[]; moreMerged: number; moreOrgs: number};

export const UH = 600;

export const LANG: Record<string, string> = {
	Go: '#00add8',
	Python: '#3572a5',
	TypeScript: '#3178c6',
	JavaScript: '#f1e05a',
	C: '#a8b9cc',
	'C++': '#f34b7d',
	Rust: '#dea584',
};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = (frame: number, from: number, to: number, out: [number, number] = [0, 1], e = Easing.out(Easing.cubic)) =>
	interpolate(frame, [from, to], out, {...clamp, easing: e});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const MERGE_PATH =
	'M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0 0 .005V3.25Z';

export const Star: React.FC<{size?: number; color: string}> = ({size = 11, color}) =>
	React.createElement(
		'svg',
		{width: size, height: size, viewBox: '0 0 16 16', fill: color, style: {marginRight: 4, verticalAlign: -1}},
		React.createElement('path', {
			d: 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z',
		}),
	);
