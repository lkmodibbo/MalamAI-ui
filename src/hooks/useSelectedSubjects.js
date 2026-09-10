import { useMemo } from 'react';
import useStudentProfile from './useStudentProfile';
import useSubjects from './useSubjects';

/**
 * Subjects the student chose during onboarding / profile.
 * Study flows (Subjects, Mock, Past questions) should use this — not the full bank.
 */
export default function useSelectedSubjects() {
  const { profile, loading: profileLoading, reloadProfile } = useStudentProfile();
  const { subjects: allSubjects, loading: subjectsLoading } = useSubjects();

  const selectedIds = useMemo(() => {
    const ids = profile?.selectedSubjects;
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  }, [profile?.selectedSubjects]);

  const subjects = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const selected = new Set(selectedIds);
    return allSubjects.filter((subject) => selected.has(subject.id));
  }, [allSubjects, selectedIds]);

  return {
    subjects,
    selectedIds,
    allSubjects,
    profile,
    loading: profileLoading || subjectsLoading,
    reloadProfile,
  };
}
