import moment from 'moment';

/**
 * 日期工具类
 */
export class DateUtils {
  
  /**
   * 获取日期范围的默认值
   */
  static getDefaultDateRange(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return {
      startDate,
      endDate
    };
  }

  /**
   * 格式化日期为MySQL格式
   */
  static formatForMySQL(date) {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 解析ISO日期字符串
   */
  static parseISOString(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateString}`);
    }
    
    return date;
  }

  /**
   * 获取时间戳
   */
  static getTimestamp(date = new Date()) {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * 时间戳转日期
   */
  static timestampToDate(timestamp) {
    // 支持秒和毫秒时间戳
    const ts = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
    return new Date(ts);
  }

  /**
   * 生成日期序列
   */
  static generateDateSequence(startDate, endDate, interval = 'day') {
    const dates = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current.add(1, interval);
    }

    return dates;
  }

  /**
   * 计算两个日期之间的差异
   */
  static dateDiff(date1, date2, unit = 'days') {
    return moment(date2).diff(moment(date1), unit);
  }

  /**
   * 获取相对时间描述
   */
  static getRelativeTime(date) {
    return moment(date).fromNow();
  }

  /**
   * 时区转换
   */
  static convertTimezone(date, timezone = 'Asia/Shanghai') {
    return moment(date).tz(timezone);
  }

  /**
   * 获取时间段描述
   */
  static getTimeRangeDescription(startDate, endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    const days = end.diff(start, 'days');

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days <= 7) {
      return `Last ${days} days`;
    } else if (days <= 30) {
      return `Last ${Math.ceil(days / 7)} weeks`;
    } else {
      return `Last ${Math.ceil(days / 30)} months`;
    }
  }

  /**
   * 验证日期范围
   */
  static validateDateRange(startDate, endDate, maxDays = 90) {
    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date format');
    }

    if (start.isAfter(end)) {
      throw new Error('Start date must be before end date');
    }

    const days = end.diff(start, 'days');
    if (days > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }

    return { startDate: start.toDate(), endDate: end.toDate(), days };
  }

  /**
   * 获取常用时间范围
   */
  static getCommonTimeRanges() {
    const now = moment();
    
    return {
      today: {
        start: now.clone().startOf('day').toDate(),
        end: now.clone().endOf('day').toDate(),
        label: 'Today'
      },
      yesterday: {
        start: now.clone().subtract(1, 'day').startOf('day').toDate(),
        end: now.clone().subtract(1, 'day').endOf('day').toDate(),
        label: 'Yesterday'
      },
      last7Days: {
        start: now.clone().subtract(7, 'days').startOf('day').toDate(),
        end: now.clone().endOf('day').toDate(),
        label: 'Last 7 days'
      },
      last30Days: {
        start: now.clone().subtract(30, 'days').startOf('day').toDate(),
        end: now.clone().endOf('day').toDate(),
        label: 'Last 30 days'
      },
      thisWeek: {
        start: now.clone().startOf('week').toDate(),
        end: now.clone().endOf('week').toDate(),
        label: 'This week'
      },
      thisMonth: {
        start: now.clone().startOf('month').toDate(),
        end: now.clone().endOf('month').toDate(),
        label: 'This month'
      }
    };
  }
}

export default DateUtils;
