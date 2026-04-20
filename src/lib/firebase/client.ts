"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import {
  getFirebaseClientConfig,
  isFirebaseClientConfigured,
} from "@/lib/firebase/config";

const APP_NAME = "microsaas-factory";

export function getFirebaseApp() {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase client configuration is incomplete.");
  }

  return getApps().find((app) => app.name === APP_NAME)
    ? getApp(APP_NAME)
    : initializeApp(getFirebaseClientConfig(), APP_NAME);
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseApp());
}
