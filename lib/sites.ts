export interface WordPressSite {
    id: string;
    name: string;
    url: string;
    username: string;
    appPassword?: string;
}

export const availableSites: WordPressSite[] = [
    {
        id: 'cloverchronicle',
        name: 'cloverchronicle.com',
        url: process.env.WP_SITE_URL_1 || '',
        username: process.env.WP_ADMIN_USERNAME_1 || '',
        appPassword: process.env.WP_ADMIN_APP_PASSWORD_1,
    },
    // Add more sites here in the future
];
