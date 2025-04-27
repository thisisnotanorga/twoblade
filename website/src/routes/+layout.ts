import type { LayoutLoad } from './$types';
import { USER_DATA } from '$lib/stores/user';

export const load: LayoutLoad = async ({ data }) => {
    USER_DATA.set(data.user);
    return data;
};
