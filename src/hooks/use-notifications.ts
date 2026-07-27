"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./use-auth";
import type { Message } from "@/types";

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if the browser supports notifications
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      // Request permission on first load if not already granted/denied
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          setPermission(perm);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!user || permission !== "granted") return;

    const supabase = createClient();

    // Listen to INSERTs on the messages table
    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Only notify for incoming messages (customer sent)
          if (newMessage.sender_type === "customer") {
            const title = `New message from ${newMessage.sender_name || newMessage.sender_id}`;
            const body = newMessage.content_text || "Sent an attachment";
            
            // Trigger browser notification
            const notification = new Notification(title, {
              body,
              icon: "/logo.png",
            });
            
            // Clicking the notification brings the window to focus
            notification.onclick = function() {
              window.focus();
              this.close();
            };
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission]);
}
