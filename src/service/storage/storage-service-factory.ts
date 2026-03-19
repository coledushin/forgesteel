import { ConnectionSettings } from '@/models/connection-settings';
import { FirebaseService } from '@/service/storage/firebase-service';
import { LocalService } from '@/service/storage/local-service';
import { StorageService } from '@/service/storage/storage-service';
import { WarehouseService } from '@/service/storage/warehouse-service';

export class StorageServiceFactory {
	static fromConnectionSettings = (settings: ConnectionSettings): StorageService => {
		if (settings.useFirebase) {
			return new FirebaseService();
		} else if (settings.useWarehouse) {
			return new WarehouseService(settings);
		} else {
			return new LocalService();
		}
	};
};
