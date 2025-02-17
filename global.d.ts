import 'mongoose';

declare module 'mongoose' {
  interface Query<ResultType = any, DocType = any, THelpers = {}> {
    withArchived(): Query<ResultType, DocType, THelpers>;
  }
}
