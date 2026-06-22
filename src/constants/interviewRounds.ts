import { ComponentType } from 'react';
import { Code2, Cpu, UserCog, Handshake, PauseCircle, Award } from 'lucide-react';

/**
 * Single source of truth for the interview-pipeline stages. Both the Dashboard
 * "Interview Pipeline" section and the dedicated Interview Pipeline page render
 * from this list, so they can never disagree. A candidate's stage is stored in
 * `candidate.interviewRound` and must match one of these `id`s.
 */
export type InterviewRoundDef = {
    id: string;
    title: string;
    /** Compact label used on the space-constrained Dashboard mini-cards. */
    shortLabel: string;
    Icon: ComponentType<{ className?: string; size?: number }>;
    // Interview Pipeline page (large cards)
    color: string;
    text: string;
    iconBg: string;
    iconColor: string;
    accent: string;
    // Dashboard mini-cards
    dashText: string;
    dashDot: string;
    dashBg: string;
};

export const INTERVIEW_ROUNDS: InterviewRoundDef[] = [
    { id: 'Technical Round 1', title: 'Technical Round 1', shortLabel: 'Technical 1', Icon: Code2,
      color: 'from-blue-50 to-indigo-50 border-blue-100', text: 'text-indigo-900', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', accent: 'bg-indigo-500',
      dashText: 'text-indigo-700', dashDot: 'bg-indigo-500', dashBg: 'bg-indigo-50/40' },
    { id: 'Technical Round 2', title: 'Technical Round 2', shortLabel: 'Technical 2', Icon: Cpu,
      color: 'from-sky-50 to-blue-50 border-sky-100', text: 'text-sky-900', iconBg: 'bg-sky-100', iconColor: 'text-sky-600', accent: 'bg-sky-500',
      dashText: 'text-sky-700', dashDot: 'bg-sky-500', dashBg: 'bg-sky-50/40' },
    { id: 'Manager Round', title: 'Manager Round', shortLabel: 'Manager', Icon: UserCog,
      color: 'from-purple-50 to-pink-50 border-purple-100', text: 'text-purple-900', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', accent: 'bg-purple-500',
      dashText: 'text-purple-700', dashDot: 'bg-purple-500', dashBg: 'bg-purple-50/40' },
    { id: 'HR Round', title: 'HR Round', shortLabel: 'HR', Icon: Handshake,
      color: 'from-emerald-50 to-teal-50 border-emerald-100', text: 'text-emerald-900', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', accent: 'bg-emerald-500',
      dashText: 'text-emerald-700', dashDot: 'bg-emerald-500', dashBg: 'bg-emerald-50/40' },
    { id: 'Hold', title: 'Hold', shortLabel: 'Hold', Icon: PauseCircle,
      color: 'from-amber-50 to-orange-50 border-amber-100', text: 'text-amber-900', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', accent: 'bg-amber-500',
      dashText: 'text-amber-700', dashDot: 'bg-amber-500', dashBg: 'bg-amber-50/40' },
    { id: 'Offer', title: 'Offer', shortLabel: 'Offer', Icon: Award,
      color: 'from-teal-50 to-green-50 border-teal-100', text: 'text-teal-900', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', accent: 'bg-teal-500',
      dashText: 'text-teal-700', dashDot: 'bg-teal-500', dashBg: 'bg-teal-50/40' },
];

/** Candidates with no round (or a legacy/unknown round) default to the first stage. */
export const DEFAULT_ROUND_ID = 'Technical Round 1';

export const roundOf = (interviewRound?: string | null): string =>
    interviewRound && INTERVIEW_ROUNDS.some(r => r.id === interviewRound)
        ? interviewRound
        : DEFAULT_ROUND_ID;
