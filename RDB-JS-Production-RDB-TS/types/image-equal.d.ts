// didn't care enough to write my own. This was ai generated, it may be very wrong, don't rely on
declare module 'image-equal' {
	export interface ImageEqualOptions {
	  /**
	   * The tolerance for the comparison (default: 0)
	   */
	  threshold?: number;
	}

	export interface DiffStats {
		data: any;
		count: number;
		ids: any;
		amount: number;
	}
  
	function imageEqual(
	  image1: string | Buffer,
	  image2: string | Buffer,
	  diff: bool|object,
	  options?: number|ImageEqualOptions
	): boolean;
  
	export = imageEqual;
}
