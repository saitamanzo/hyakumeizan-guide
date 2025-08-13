"use client";
import React from "react";
import MountainForm from "@/components/admin/MountainForm";

export default function AdminMountainNewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">山 新規作成（管理者）</h1>
      <MountainForm mode="create" />
    </div>
  );
}
