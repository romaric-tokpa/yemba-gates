'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  format?: 'number' | 'currency' | 'percentage' | 'duration'
  currency?: string
}

export default function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  format = 'number',
  currency = 'XOF',
}: KPICardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'duration':
        return `${val} jours`
      default:
        return new Intl.NumberFormat('fr-FR').format(val)
    }
  }

  const getTrendColor = () => {
    if (!trend && change === undefined) return 'text-gray-500'
    const actualTrend = trend || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral')
    
    switch (actualTrend) {
      case 'up':
        return 'text-success'
      case 'down':
        return 'text-error'
      default:
        return 'text-gray-500'
    }
  }

  const getTrendIcon = () => {
    if (!trend && change === undefined) return null
    const actualTrend = trend || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral')
    
    switch (actualTrend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4" />
      case 'down':
        return <ArrowDownRight className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#1F2A44]">{formatValue(value)}</p>
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className={`flex items-center text-sm font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          {change !== undefined && (
            <span className="ml-1">
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {changeLabel && (
            <span className="ml-1">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
