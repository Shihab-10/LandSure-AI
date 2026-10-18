import type { ComponentType } from "react";

export type DashboardModuleId =
  | "explorer"        // ১. জমি খুঁজুন
  | "saved"           // ২. সংরক্ষিত জমি
  | "verification"    // ৩. জমি যাচাইকরণ (৯-ধাপ গাইড)
  | "documents"       // ৪. দলিল পরীক্ষা ও OCR
  | "copilot"         // ৫. ভূমি সহকারী
  | "lawyers"         // ৬. আইনজীবীর পরামর্শ
  | "passport"        // ৭. যাচাই প্রতিবেদন
  | "my_land"         // ৮. আমার জমি
  | "notifications"   // ৯. নোটিফিকেশন
  | "dashboard"       // অ্যালাইয়াস
  | "overview"        // অ্যালাইয়াস
  | "search"          // অ্যালাইয়াস
  | "journey"         // অ্যালাইয়াস
  | "tax_calc"        // অ্যালাইয়াস
  | "ownership"       // অ্যালাইয়াস
  | "watchlist";      // অ্যালাইয়াস



export interface DashboardNavModule {
  id: DashboardModuleId;
  labelBn: string;
  labelEn: string;
  subtitleBn: string;
  subtitleEn: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

export interface ParcelDetails {
  parcel_id: string;
  district_code?: string;
  upazila_code?: string;
  mouza_code?: string;
  reference_area_decimal?: string | number;
  record_status?: string;
  is_synthetic?: string | boolean;
  district_name_bn?: string;
  district_name_en?: string;
  upazila_name_bn?: string;
  upazila_name_en?: string;
  mouza_name_bn?: string;
  mouza_name_en?: string;
  display_name_bn?: string;
  display_name_en?: string;
  land_classification_bn?: string;
  asking_price_bdt?: number;
  [key: string]: unknown;
}
