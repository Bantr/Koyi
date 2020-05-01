import { EntityRepository, Repository } from 'typeorm';

import Ban from '../ban/ban.entity';
import User from '../user/user.entity';
import Notification from './notification.entity';

/**
 * Database operations for Notifications
 */
@EntityRepository(Notification)
export class NotificationRepository extends Repository<Notification> {

    /**
     * Create a new Notification in the database
     * @param data
     */
    async createNotification(user: User, ban: Ban): Promise<Notification> {
        const notification = new Notification();
        notification.ban = ban;
        notification.user = user;

        return await notification.save();
    }
}
