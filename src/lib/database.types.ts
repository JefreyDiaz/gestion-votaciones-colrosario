export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      poll_options: {
        Row: {
          candidate_name: string;
          created_at: string;
          id: string;
          image_url: string | null;
          poll_id: string;
          sort_order: number;
        };
        Insert: {
          candidate_name: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          poll_id: string;
          sort_order?: number;
        };
        Update: {
          candidate_name?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          poll_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
      polls: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string;
          id: string;
          scope: "general" | "salon";
          status: "draft" | "open" | "closed" | "archived";
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at: string;
          id?: string;
          scope?: "general" | "salon";
          status?: "draft" | "open" | "closed" | "archived";
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string;
          id?: string;
          scope?: "general" | "salon";
          status?: "draft" | "open" | "closed" | "archived";
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          voter_document: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          voter_document: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          voter_document?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "poll_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      poll_scope: "general" | "salon";
      poll_status: "draft" | "open" | "closed" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};
