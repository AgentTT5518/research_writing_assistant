import { useQuery } from '@tanstack/react-query';
import { fetchProject } from '../services';

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}
