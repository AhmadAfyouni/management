import { Injectable } from '@nestjs/common';
import { PaginatedResult, PaginationOptions } from '../interfaces/pagination.interface';
import { Model, Document, FilterQuery, PopulateOptions } from 'mongoose';

@Injectable()
export class PaginationService {

    async paginate<T extends Document>(
        model: Model<T>,
        options: PaginationOptions,
        filter: FilterQuery<T> = {},
        populate: string | string[] = []
    ): Promise<PaginatedResult<T>> {
        const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', search = '' } = options;

        if (search) {
            filter['$or'] = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const sortObject: any = {};
        sortObject[sort] = order === 'asc' ? 1 : -1;

        const total = await model.countDocuments(filter).exec();

        let query = model.find(filter).sort(sortObject).skip(skip).limit(limit);

        if (populate) {
            if (Array.isArray(populate)) {
                populate.forEach(path => {
                    query = query.populate(path);
                });
            } else {
                query = query.populate(populate);
            }
        }

        const data = await query.exec();

        const totalPages = Math.ceil(total / limit);

        return {
            data: data as T[],
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }


    async paginateWithPopulate<T>(
        model: Model<any>,
        options: PaginationOptions,
        filter: FilterQuery<any> = {},
        populateOptions: PopulateOptions[] = []
    ): Promise<PaginatedResult<T>> {
        const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', search = '' } = options;

        // Apply search if provided
        if (search) {
            // This is a generic approach - customize for your specific models
            filter['$or'] = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Build sort object
        const sortObject: any = {};
        sortObject[sort] = order === 'asc' ? 1 : -1;

        // Get total count for pagination metadata
        const total = await model.countDocuments(filter).exec();

        // Get paginated data with complex population
        let query = model.find(filter).sort(sortObject).skip(skip).limit(limit);

        // Apply complex population
        if (populateOptions && populateOptions.length > 0) {
            populateOptions.forEach(option => {
                query = query.populate(option);
            });
        }

        // Execute the query, with lean() for better performance
        const data = await query.lean().exec();

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);

        return {
            data: data as T[],  // Type assertion to handle lean objects
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }
}
