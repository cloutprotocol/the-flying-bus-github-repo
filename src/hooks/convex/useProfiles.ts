/**
 * Convex Profile Hooks
 * Example hooks showing how to use Convex reactive queries for user profiles
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Hook to fetch a profile by ID
 */
export function useProfile(profileId: Id<"profiles"> | undefined) {
  return useQuery(
    api.profiles.getById,
    profileId ? { profileId } : "skip"
  );
}

/**
 * Hook to fetch a profile by email
 */
export function useProfileByEmail(email: string | undefined) {
  return useQuery(
    api.profiles.getByEmail,
    email ? { email } : "skip"
  );
}

/**
 * Hook to fetch a profile by username
 */
export function useProfileByUsername(username: string | undefined) {
  return useQuery(
    api.profiles.getByUsername,
    username ? { username } : "skip"
  );
}

/**
 * Hook to fetch profiles by role
 */
export function useProfilesByRole(role: string | undefined) {
  return useQuery(
    api.profiles.getByRole,
    role ? { role } : "skip"
  );
}

/**
 * Hook to fetch all profiles with pagination
 */
export function useAllProfiles(page: number = 1, limit: number = 20) {
  return useQuery(api.profiles.getAll, { page, limit });
}

/**
 * Hook to create a profile
 */
export function useCreateProfile() {
  return useMutation(api.profiles.create);
}

/**
 * Hook to update a profile
 */
export function useUpdateProfile() {
  return useMutation(api.profiles.update);
}

/**
 * Hook to update user role
 */
export function useUpdateRole() {
  return useMutation(api.profiles.updateRole);
}

/**
 * Hook to delete a profile
 */
export function useDeleteProfile() {
  return useMutation(api.profiles.remove);
}
