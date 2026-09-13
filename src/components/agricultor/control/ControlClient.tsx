"use client";

import React from "react";
import { ControlPanel } from "@/features/control";
import type { ControlPanelProps } from "@/features/control/types";

export default function ControlClient(props: ControlPanelProps) {
  return <ControlPanel {...props} />;
}
